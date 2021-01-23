const express = require('express')
const authMiddleware = require('../middlewares/auth')
const Project = require('../models/Projects')
const Task = require('../models/Task');
const fetch = require('node-fetch');

const route = express.Router()

route.use(authMiddleware)

/*route.get('/time/:sigla', async (req, res) => {
    const { sigla } = req.params;
    const dynamicDate = new Date()
    const JsonResponse = await fetch(`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${sigla}/distritos`)
        .then(res => {
            const resdares = res.json()
            return resdares
        })

    res.json({
        date: dynamicDate.toGMTString(),
        info: JsonResponse,
    })
})*/

route.get('/', async (req, res) => {
    try {
        const projects = await Project.find().populate(['user', 'tasks'])

        return res.send({ projects })
    } catch (err) {
        res.status(400).send({ error: 'Error loading projects' })
    }

})

route.get('/:projectId', async (req, res) => {
    try {
        const project = await Project.findById(req.params.projectId).populate(['user', 'tasks'])

        return res.send({ project })
    } catch (err) {
        res.status(400).send({ error: 'Error loading projects' })
    }

})

route.post('/', async (req, res) => {
    try {
        const { title, description, tasks } = req.body;

        const project = await Project.create({ title, description, user: req.userId });

        await Promise.all(tasks.map(async task => {
            const projectTask = new Task({ ...task, project: project._id })

            await projectTask.save()

            project.tasks.push(projectTask)

        }))

        await project.save()

        res.send({ project })

    } catch (err) {
        console.log(err)
        res.status(400).send({ err: 'Error creating new project' })
    }
})

route.put('/:projectId', async (req, res) => {
    try {
        const { title, description, tasks } = req.body;

        const project = await Project.findByIdAndUpdate(req.params.projectId, {
            title,
            description,
        }, { new: true });

        // OLHAR DEPOIS

        project.tasks = [];

        await Task.remove({ project: project._id })

        await Promise.all(tasks.map(async task => {
            const projectTask = new Task({ ...task, project: project._id })

            await projectTask.save()

            project.tasks.push(projectTask)

        }))

        await project.save()

        res.send({ project })

    } catch (err) {
        console.log(err)
        res.status(400).send({ err: 'Error updating new project' })
    }
})

route.delete('/:projectId', async (req, res) => {
    try {
        const project = await Project.findByIdAndRemove(req.params.projectId)

        if (!project)
            return res.status(400).send({ error: 'Project not exist' })

        return res.send()
    } catch (err) {
        res.status(400).send({ error: 'Error delete project' })
    }
})


module.exports = app => app.use('/projects', route)